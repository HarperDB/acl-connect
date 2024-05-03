# HarperDB ACL-Connect

This component allows you define a set of topics for pub/sub (MQTT) with ACLs specifying permissions. To use this, you
should add this extension to your application's config.yaml:
```yaml
acl-connect:
  package: harperdb-acl-connect
  database: data # The database to use for pub/sub
  file: connect.json
```

And connect.json should be a JSON file with the following format:
```json
{
  "acls": [
    {
      "topicFilter": "topic/sub-topic/#",
      "publishers": [
        "a-group",
        "another-group"
      ],
      "subscribers": [
        "another-group"
      ]
    },
    ...
  ]
}
```
Topics support substitution with `%u` for the user's username and `%c` for the client id. For example, a topic of `user/%u` would be translated to `user/smith` for a user with the username `smith`.