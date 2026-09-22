-- Collapses pending_messages/messages/accepted_client_ids into a single
-- messages table (see src/features/chat/storage/schema.ts). This is a
-- pre-launch demo app with no real user data to preserve, so this migration
-- drops and recreates rather than attempting a column-by-column carryover
-- from the old, differently-shaped `messages` table.
DROP TABLE IF EXISTS `accepted_client_ids`;--> statement-breakpoint
DROP TABLE IF EXISTS `pending_messages`;--> statement-breakpoint
DROP TABLE IF EXISTS `messages`;--> statement-breakpoint
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
CREATE INDEX `idx_messages_conversation_status` ON `messages` (`conversationId`,`status`);
