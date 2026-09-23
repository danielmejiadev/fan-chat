CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`serverId` text,
	`clientId` text,
	`conversationId` text NOT NULL,
	`senderId` text NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer NOT NULL,
	`status` text NOT NULL,
	`failureReason` text
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_created` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_messages_conversation_status` ON `messages` (`conversationId`,`status`);--> statement-breakpoint
CREATE TABLE `store_purchases` (
	`purchaseId` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`priceCents` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`userId` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`purchaseId` text,
	`updatedAt` integer NOT NULL
);
