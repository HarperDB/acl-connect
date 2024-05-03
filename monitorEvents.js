
export function startMonitoring(ensureTable) {
	const { clustering } = server.config;
	const NODE_NAME = clustering?.nodeName; // this won't necessarily work with new replication
	const SYS_CON = ensureTable({ table: 'SYS_CON', database: 'mqtt_monitor', attributes: [] });
	server.mqtt.events.on('connection', async (socket) => {
		await SYS_CON.publish(['monitor', 'con', 'connects'], {
			timestamp: Date.now(),
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			type: 'connecting',
			instance_name: NODE_NAME
		});
	})
	server.mqtt.events.on('connected', async (session, socket) => {
		await SYS_CON.publish('connects', {
			timestamp: Date.now(),
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			type: 'connected',
			instance_name: NODE_NAME,
			clientId: session.sessionId,
			userName: session.user.username,
			authGroups: session.user.authGroups
		});
	})
	server.mqtt.events.on('disconnected', async (session, socket) => {
		await SYS_CON.publish('drops', {
			timestamp: Date.now(),
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			type: 'disconnected',
			instance_name: NODE_NAME,
			clientId: session?.sessionId,
			userName: session?.user?.username,
			authGroups: session?.user?.authGroups
		});
	})
	server.mqtt.events.on('auth-failed', async (session, socket, error) => {
		await SYS_CON.publish('errors', {
			timestamp: Date.now(),
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			type: 'auth-failed',
			error: error.message,
			instance_name: NODE_NAME,
			clientId: session.clientId,
			userName: session.username,
			password: session.password.toString()
		});
	})
	server.mqtt.events.on('error', async (error, socket, packet, session) => {
		await SYS_CON.publish('errors', {
			timestamp: Date.now(),
			remoteAddress: socket.remoteAddress,
			remotePort: socket.remotePort,
			type: 'error',
			error: error.message,
			instance_name: NODE_NAME,
			clientId: session?.clientId,
			userName: session?.username
		});
	})
}