import { findTopicsForUser, mqttPermissionCheck } from './permission.js';
import { startMonitoring } from './monitorEvents.js';

export function start({ ensureTable, database, monitoring }) {
	if (monitoring !== false) // default to true, but allow it to be disabled in the config
		startMonitoring(ensureTable);
	return {
		handleFile,
		setupFile: handleFile,
	};

	async function handleFile(content, url_path, file_path, resources) {
		const connect_config = JSON.parse(content);
		const database_name = database || 'data';
		const tables = databases[database_name];
		const resources_to_permission = new Map();
		// iterate through all the ACLs and get the appropriate resource or table that we are going to extend
		for (const acl of connect_config.acls) {
			if (typeof acl.topicFilter !== 'string') throw new Error('ACL must have a topicFilter (as a string)');
			const path = acl.topicFilter.split('/');
			let resource_to_permission;
			let resource_path;
			for (let i = path.length; i >= 1; i--) {
				// if there is an existing exported resource, we will use that
				resource_path = path.slice(0,i).join('/');
				resource_to_permission = resources.get(resource_path)?.Resource;
				if (resource_to_permission) break;
			}
			if (!resource_to_permission) {
				// otherwise we will use the table, ensuring that it exists first
				resource_path = path[0];
				const table = ensureTable({ table: resource_path, database: database_name, attributes: [] });
				resource_to_permission = table;
			}
			// add all the ACLs to the resource that we will apply the permissions to
			let resource_entry = resources_to_permission.get(resource_path);
			if (!resource_entry) resources_to_permission.set(resource_path, resource_entry = { resource: resource_to_permission, acls: [] });
			resource_entry.acls.push(acl);
		}
		for (let [ resource_path, resource_entry ] of resources_to_permission) {
			// now apply the set of ACLs to the resource, extending the resource to define access
			const new_resource_class = applyPermissions(resource_path.split('/'), resource_entry);
			resources.set(resource_path, new_resource_class );
		}
	}
}
function applyPermissions(path, { resource, acls }) {
	return class extends resource {
		allowRead(user, query, context) {
			const topic = context?.topic;
			const id = topic.split('/');
			const allowed_topics = findTopicsForUser(acls, user, context?.session?.sessionId, false);
			if (mqttPermissionCheck(id, allowed_topics)) {
				return true;
			}
			return super.allowRead(user);
		}

		allowCreate(user, query, context) {
			let id = this.getId();
			if (!Array.isArray(id)) {
				if (!id) {
					id = [];
				} else {
					id = [id];
				}
			}
			id = [...path, ...id];
			const allowed_topics = findTopicsForUser(acls, user, context?.session?.sessionId, true);
			if (mqttPermissionCheck(id, user?.mqtt_permissions?.publishes)) {
				return true;
			}
			return super.allowCreate(user);
		}
	}
}

export const startOnMainThread = start;