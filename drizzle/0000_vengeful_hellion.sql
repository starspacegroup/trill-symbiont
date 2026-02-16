CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `shared_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`global_name` text,
	`avatar` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
