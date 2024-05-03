# HarperDB ACL-Connect

This component allows you define a set of topics for pub/sub (MQTT) with ACLs specifying permissions. To use this, you
should add this extension to your application's config.yaml:
```yaml
acl-connect:
  package: harperdb-acl-connect
  database: data # The database to use for pub/sub
  monitoring: true # Enable monitoring of MQTT events
  file: acl.json
```