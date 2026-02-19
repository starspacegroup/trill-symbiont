ALTER TABLE `shared_sessions` ADD COLUMN `state` text NOT NULL DEFAULT '{}';
--> statement-breakpoint
ALTER TABLE `shared_sessions` ADD COLUMN `state_version` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE `session_presence` (
	`session_id` text NOT NULL,
	`user_id` text NOT NULL,
	`username` text NOT NULL,
	`avatar` text,
	`last_seen` integer NOT NULL,
	PRIMARY KEY (`session_id`, `user_id`),
	FOREIGN KEY (`session_id`) REFERENCES `shared_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
