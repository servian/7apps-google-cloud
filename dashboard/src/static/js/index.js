/* eslint-disable no-unused-expressions */

import { ApplicationService } from './services/app.js'
import { CommentService } from './services/comment.js'
import { LogService } from './services/log.js'
import { NotificationService } from './services/notification.js'
import { Timeline } from './timeline.js'

const props = window.props
const notificationService = new NotificationService()
const timeline = new Timeline({
  el: document.getElementById('timeline')
})
const comment = new CommentService({
  el: document.getElementById('commentary')
})
const logger = new LogService({
  el: document.getElementById('logs'),
  notificationService
})
const app = new ApplicationService({
  apps: props.apps,
  notificationService
})

// Debug WebSocket
notificationService.subscribe('echo', message =>
  comment.add({ text: message.data.text })
)
;(() => {
  window.demo = function () {
    const data = {
      ...props,
      isFullscreen: false,
      isLoading: false,
      isDeploying: false,
      showPreview: false,
      showLogs: false,
      themeIndex: 0
    }

    const methods = {
      init () {
        this.loadFonts()
        this.addUpdateListener()
      },
      loadFonts () {
        window.WebFont.load({
          google: { families: this.themes.map(t => t.font) }
        })
      },
      toggleFullscreen () {
        this.isFullscreen = !this.isFullscreen
      },
      previousTheme () {
        this.themeIndex =
          this.themeIndex === 0 ? this.themes.length - 1 : this.themeIndex - 1
      },
      nextTheme () {
        this.themeIndex =
          this.themeIndex + 1 === this.themes.length ? 0 : this.themeIndex + 1
      },
      theme () {
        return this.themes[this.themeIndex]
      },
      themeGradient () {
        const theme = this.theme()
        const colors = theme.gradient.colors
        return [
          `background: ${colors[0]};`,
          `background: linear-gradient(45deg,${colors.join(
            ','
          )}) 0% 0% / 400% 400%;`
        ].join(' ')
      },
      addUpdateListener () {
        notificationService.subscribe('refresh-app', message => {
          const { app, version, duration } = message.data
          comment.add({
            text: `<span class='is-fancy'>${app.title}</span> has been updated to version <span class="is-family-monospace">${version}</span>`,
            style: 'success'
          })
          timeline.add({ app, duration })
        })
        notificationService.subscribe('build', message => {
          if (message.data.status === 'finished') {
            timeline.stopCountdown()
            setTimeout(() => {
              this.isDeploying = false
              this.build = null
            }, 45000)
          }
        })
      },
      async deployTheme () {
        this.isLoading = true
        const resp = await app.deploy({
          data: this.theme()
        })

        // A status of 409 means another build already in-progress
        if (!resp.ok && resp.status !== 409) {
          this.isLoading = false
          comment.add({ text: resp.statusText })
          return
        }

        const build = await resp.json()
        logger.getLogs(build.id)
        this.build = build // { id, version }
        this.isDeploying = true

        // Keep loading for a bit longer to allow time for some initial logs to
        // show up
        setTimeout(() => {
          this.isLoading = false
        }, 1500)

        const logComment = [
          '<p>The stream of text you see below are the current logs being generated by Cloud Build.</p>',
          '<p>You can check out its config along with the source code for everything else on ',
          "<a href='https://github.com/servian/7apps-google-cloud/blob/demo/app/cloudbuild.yaml'><strong>GitHub</strong></a>.</p>"
        ].join('')

        if (resp.status === 409) {
          const message = [
            '<p>It seems a another deployment is already in-progress. Give it a minute or two <em>(or seven)</em> and try again.</p>',
            "<p>In the meantime, let's check out what's happening with the current deployment.</p>"
          ].join('')
          comment.queue({ messages: [message, logComment], style: 'danger' })
        } else {
          const message = [
            '<p><span class="is-fancy">Woohoo!</span> You just triggered a new <strong>Cloud Build</strong> job!</p>',
            `<p>Keep an eye out for the version <span class="is-family-monospace">${build.version}</span>, that's yours!</p>`
          ].join('')
          comment.queue({ messages: [message, logComment], style: 'success' })
        }
        const currentTime = new Date()
        const startTime = new Date(build.started)
        timeline.startCountdown(Math.abs(currentTime - startTime))
      }
    }

    return {
      ...data,
      ...methods
    }
  }

  import(
    'https://cdn.jsdelivr.net/gh/alpinejs/alpine@v2.x.x/dist/alpine.min.js'
  )
})()
