/**
 * Given the provided ACLs, and user, find the ACLs that the user has subscribe (or publish) permissions for.
 * @param acls - The list of ACLs that could apply to a topic
 * @param user - The user object
 * @param client_id - The client_id of the user
 * @param publish - Whether to check for publish or subscribe permissions
 */
export function findTopicsForUser(acls, user, client_id, publish = false) {
	return acls.map(acl => {
		const acl_groups = acl[publish ? 'publishers' : 'subscribers'];
		let user_groups = user.authGroups || user.role?.role;
		// It appears that the convention for auth groups is to use a semicolon to separate groups
		if (user_groups && !Array.isArray(user_groups)) user_groups = user_groups.split(';');
		if (acl_groups?.some(group => user_groups.includes(group) || (!publish && acl.anonymousSubscriber))) {
			return acl.topicFilter.replace(/\/%u/g, `/${user.username}`).replace(/\/%c/g, `/${client_id}`).split('/');
		}
	}).filter(topic => topic);
}

/**
 * Check if the provided id/topic is allowed to subscribe/publish to the list of allowed topics
 * @param id
 * @param allowed_topics
 * @return {boolean}
 */
export function mqttPermissionCheck(id, allowed_topics) {
	if (!Array.isArray(allowed_topics) || allowed_topics.length === 0) {
		return false;
	}

	let match = false;

	//iterate each subscription to compare to the id
	for (let x = 0, length = allowed_topics.length; x < length; x++) {
		let topic = allowed_topics[x];
		let inner_match = true;

		//we iterate  the id elements as the attempted pub/sub could be shallower (shallower is acceptable) or deeper (deeper not acceptable) than the ACL and we need to test for that
		for (let y = 0, id_length = id.length; y < id_length; y++) {
			let id_element = id[y];
			//get the subscription element at the same index of the id element
			let sub_element = topic[y];

			//if sub_element is null the attempted pub/sub is deeper than the ACL allows, so we fail the test
			if (sub_element === undefined) {
				inner_match = false;
				break;
			}

			//If ACL allows for multi-level this is a match and we allow the pub/sub
			if (sub_element === '#') {
				match = true;
				break;
			}

			//if ACL allows for single level we continue the iterator to keep testing
			if (sub_element === '+') {
				//this is a mismatch in wild cards where the attempt is multi-level vs the ACL allowing single level
				if (id_element === '#') {
					inner_match = false;
					break;
				}

				continue;
			}

			//if the elements do not match by this point we fail out this subscription
			if (sub_element !== id_element) {
				inner_match = false;
				break;
			}

		}
		if (match === true) {
			break;
		}

		if (inner_match && id.length === topic.length) {
			match = true;
			break;
		}
	}

	return match;
}
