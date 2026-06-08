# HarperDB ACL-Connect

This component allows you define a set of topics for pub/sub (MQTT) with ACLs specifying permissions.

To use this, add `@harperdb/acl-connect` to your projects dependencies and then add this extension to your application's config.yaml:
```yaml
acl-connect:
  package: "@harperdb/acl-connect"
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


### Anonymous Subscriptions
In order for anonymous subscriptions to work correctly:

`requireAuthentication` must be set to `false` in your harper config. For example:
```yaml
# In harperdb-config.yaml
mqtt:
    requireAuthentication: false
```



### System Channel ($SYS) Monitoring
The `$SYS` channel is a built-in, read-only namespace your MQTT broker uses to publish its own internal events (connections, disconnections, auth failures, errors, etc.).
Clients can subscribe to `$SYS/monitor/con/#` to get a live JSON feed of every broker event, then feed those into dashboards, alerting systems, or auto-scaling logic.

**How it works**
Your server’s startMonitoring code listens for connection, connected, disconnected, auth-failed and error events, writes them into the `mqtt_monitor.SYS_CON` table, and (with a small republisher) re-emits each row as an MQTT message under `$SYS/monitor/con/{eventType}`.
Any MQTT client in the right ACL group simply subscribes to that topic filter and parses each incoming JSON payload.

**Getting Started**
You can use Harper Studio credentials to authenticate and obtain the sys-monitor role.
[Create a user role](https://docs.harperdb.io/docs/developers/operations-api/users-and-roles#add-role) with read only permissions to the `SYS_CON` table.
Add this role to a [new user](https://docs.harperdb.io/docs/developers/operations-api/users-and-roles#add-user) or an [existing user](https://docs.harperdb.io/docs/developers/operations-api/users-and-roles#alter-user).
You will be able to assign this user to monitor events in the following steps.


In `acl.json`, define a new `sys-monitor` role that gives “read” access to the Harper table `mqtt_monitor.SYS_CON`, which is where all broker events are stored.Grant read-only access to the `SYS_CON` table:

```
{
  "sys-monitor": [
    {
      "schema": "mqtt_monitor",
      "table":  "SYS_CON",
      "read":   true,
      "write":  false
    }
  ]
}
```

Next, you will need to allow SYS subscriptions.
Within the connect.json you then give that group permission to subscribe to `$SYS/monitor/con/#` and pull down the live stream of those events.

```
{
  "acls": [
    {
      "topicFilter": "$SYS/monitor/con/#",
      "publishers":  [],
      "subscribers": [
        "sys-monitor"
      ]
    }
  ]
}
```


Your client can then subscribe to the `$SYS` channel.
```
client.subscribe('$SYS/monitor/con/#', { qos: 1 });
```


You can stream `$SYS/monitor/con/#` JSON events into a metrics pipeline and build dashboards that chart connection/disconnect rates, auth-failure spikes or error counts over time.
In Grafana you might plot connections vs disconnects panels, whilest in DataDog you could send `mqtt.sys.auth-failed` counters and create time-series graphs and alerts on abnormal spikes.
