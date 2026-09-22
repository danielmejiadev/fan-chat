CREATE TABLE `accepted_client_ids` (
	`clientId` text PRIMARY KEY NOT NULL,
	`serverId` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`serverId` text PRIMARY KEY NOT NULL,
	`clientId` text,
	`conversationId` text NOT NULL,
	`senderId` text NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_messages_conversation` ON `messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `pending_messages` (
	`clientId` text PRIMARY KEY NOT NULL,
	`conversationId` text NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer NOT NULL,
	`status` text NOT NULL,
	`failureReason` text
);
--> statement-breakpoint
CREATE INDEX `idx_pending_messages_conversation` ON `pending_messages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `purchase_confirmations` (
	`purchaseId` text PRIMARY KEY NOT NULL,
	`entitlementStatus` text NOT NULL,
	`confirmedAt` integer
);
--> statement-breakpoint
CREATE TABLE `store_purchases` (
	`purchaseId` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`priceCents` integer NOT NULL,
	`currency` text NOT NULL,
	`status` text NOT NULL,
	`createdAt` integer NOT NULL
);
