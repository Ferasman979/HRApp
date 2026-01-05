FROM grafana/tempo:latest

COPY tempo.yaml /etc/tempo.yaml

# Ensure Tempo runs with this config by default
CMD ["-config.file=/etc/tempo.yaml"]
