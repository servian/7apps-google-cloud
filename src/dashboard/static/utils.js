(function () {
  /* LOG STREAM CLIENT ------------------------------------------------------ */

  window.LogStreamClient = (function () {
    const scheme = window.location.protocol == "https:" ? "wss://" : "ws://";
    const webSocketUri =
      scheme +
      window.location.hostname +
      (location.port ? ":" + location.port : "") +
      "/ws";

    const createLogElement = (data) => {
      let el = document.createElement("p");

      el.setAttribute("data-build-id", data.id);
      el.setAttribute("data-step-id", data.step_id);
      el.setAttribute("data-step-name", data.step_name);
      el.setAttribute("data-timestamp", data.timestamp);
      el.setAttribute("data-source", data.source);
      el.setAttribute("data-state", data.state);

      let ts = new Date(data.timestamp);
      let tsHours = ts.getHours().toString().padStart(2, "0");
      let tsMinutes = ts.getMinutes().toString().padStart(2, "0");
      let tsHtml = `<span class="lg-ts">${tsHours}:${tsMinutes}</span>`;
      let stepHtml = `<span class="lg-step">${data.step_name}</span>`;

      el.innerHTML = `${tsHtml} ${stepHtml} ${data.text}`;
      return el;
    };

    const connect = (logContainerElement) => {
      const websocket = new WebSocket(webSocketUri);
      websocket.onopen = () => console.log("✏️ Log stream connected");
      websocket.onerror = (e) => console.log(`💥 Error with log stream: ${e}`);
      websocket.onclose = () => {
        console.log("🔌 Log stream disconnected");
        // Attempt to re-connect
        setTimeout(() => connect(), 1000);
      };
      websocket.onmessage = (event) => {
        if (logContainerElement === null) return;
        let data = JSON.parse(event.data);
        let logElement = createLogElement(data);
        logContainerElement.appendChild(logElement);
        logContainerElement.scrollTop = logContainerElement.scrollHeight;
      };
    };

    var logContainerElement = null;

    return {
      connect: (el) => {
        logContainerElement = el;
        connect(logContainerElement);
      },
    };
  })();

  /* APPLICATION STATUS ----------------------------------------------------- */

  window.App = (() => {
    const appMap = new Map();
    const versionMap = new Map();

    const checkStatus = async (iframeElement) => {
      const overlayElement = document.getElementById(
        `${iframeElement.dataset.name}-overlay`
      );
      const parentElement = iframeElement.parentElement;
      const appUrl = iframeElement.dataset.url;
      const appName = iframeElement.dataset.name;
      const appTitle = iframeElement.dataset.title;
      const timestamp = Date.now();
      const app = appMap.get(appName);

      try {
        // Get current app version (git commit hash)
        var response = await fetch(appUrl, {
          cache: "no-cache",
          headers: { "Accept-Language": "application/json" },
        });
        var data = await response.json();
        var newVersion = data.commit_sha;
      } catch (e) {
        overlayElement.classList.remove("is-hidden");
        overlayElement.getElementsByClassName("title")[0].innerText = e.message;
        return;
      }

      if (response === undefined || !response.ok || newVersion === undefined) {
        // Although there's no error, something's still not right
        overlayElement.classList.remove("is-hidden");
        overlayElement.getElementsByClassName("title")[0].innerHTML =
          '<span class="is-size-3">🙈</span>';
        return;
      }

      // Remove overlay from iframe and reveal app
      overlayElement.classList.add("is-hidden");

      if (app === undefined) {
        appMap.set(appName, {
          version: newVersion,
          previousVersion: null,
          lastUpdated: timestamp,
        });
      } else if (newVersion !== app.version && newVersion !== app.previousVersion) {
        console.log(`💾 New version found for ${appTitle}: ${newVersion}`);

        appMap.set(appName, {
          version: newVersion,
          previousVersion: app.version,
          lastUpdated: timestamp,
        });

        // Record new version for leaderboard
        var versionStats = versionMap.get(newVersion);
        if (versionStats === undefined) {
          versionStats = new Array();
          versionMap.set(newVersion, versionStats);
        }
        versionStats.push({ app: app.name, title: app.title, updated: timestamp });

        // Add query string to avoid any caching issues
        iframeElement.name = `${iframeElement.name.split("-")[0]}-${timestamp}`;
        iframeElement.src = `${appUrl}?ts=${timestamp}`; // forces refresh

        // Draw attention to the app if a new version is detected
        parentElement.classList.add("has-new-version");
        setTimeout(() => parentElement.classList.remove("has-new-version"), 3000);
      }
    };

    // Start polling loop
    const monitorStatus = async ({ interval }) => {
      if (monitoringEnabled) {
        var iframes = document.getElementsByTagName("iframe");
        for (var i = 0, max = iframes.length; i < max; i++) {
          checkStatus(iframes[i]);
        }
      }
      setTimeout(() => monitorStatus({ interval }), interval);
    };

    const pauseMonitoring = () => (monitoringEnabled = false);
    const resumingMonitoring = () => (monitoringEnabled = true);

    var monitoringEnabled = true;

    return {
      monitorStatus,
      pauseMonitoring,
      resumingMonitoring,
      apps: appMap,
      versionStats: versionMap,
    };
  })();

  /* DEPLOYMENT CLIENT ------------------------------------------------------ */

  window.DeploymentClient = (function () {
    const triggerDeployment = async ({ gradientName, asciiFont, titleFont }) => {
      let payload = {
        style: {
          gradient_name: gradientName,
          ascii_font: asciiFont,
          title_font: titleFont,
        },
      };
      let resp = await fetch("/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return { status: resp.status, data: resp.json() };
    };

    return {
      triggerDeployment,
    };
  })();
})();
