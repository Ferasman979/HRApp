FROM grafana/grafana:latest

# 2. Fix Permissions & Create Dirs (Run as root first)
USER root
RUN mkdir -p /etc/grafana/provisioning/datasources \
    && mkdir -p /etc/grafana/provisioning/dashboards/json \
    && chown -R 472:472 /etc/grafana/provisioning

# 3. Copy Provisioning Configs
# 3. Copy Provisioning Configs (With correct ownership)
COPY --chown=472:472 datasources.yml /etc/grafana/provisioning/datasources/datasources.yml
COPY --chown=472:472 dashboards.yml /etc/grafana/provisioning/dashboards/dashboards.yml
COPY --chown=472:472 mcp_dashboard.json /etc/grafana/provisioning/dashboards/json/mcp_dashboard.json
COPY --chown=472:472 frontend_dashboard.json /etc/grafana/provisioning/dashboards/json/frontend_dashboard.json

# Switch back to grafana user
USER 472


