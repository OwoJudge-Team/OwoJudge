# Setup Guide

```
docker-compose up -d
docker exec judge-backend bash /app/start.sh
```

File: .colima/default/colima.yaml
```
docker:
  exec-opts:
    - native.cgroupdriver=cgroupfs
```