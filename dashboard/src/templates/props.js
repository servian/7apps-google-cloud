var props = {
  apps: {{ app_service.app_names|tojson }},
  gradients: {{ app_service.gradients|tojson }},
  fonts: {{ app_service.google_fonts|tojson }},
  asciiFonts: {{ app_service.ascii_fonts|tojson }}
};