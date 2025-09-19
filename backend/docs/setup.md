# Setup Guide

```
docker-compose up -d
```

File: .colima/default/colima.yaml
```
docker:
  exec-opts:
    - native.cgroupdriver=cgroupfs
```