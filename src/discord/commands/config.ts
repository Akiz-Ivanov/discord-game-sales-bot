import {
  InteractionResponseType,
  MessageFlags,
  ApplicationCommandOptionType,
} from 'discord-api-types/v10'
import type { CommandHandler } from '@/types'
import { getInteractionGuildId } from '@/discord/interactions/getInteractionGuildId'
import { upsertGuildChannel, getGuildByGuildId } from '@/repositories/guilds'
import { buildRemoveAlertsConfirmButtons } from '@/discord/interactions/buildRemoveAlertsConfirmButtons'

const getSubcommand = (interaction: Parameters<CommandHandler>[0]) => {
  const sub = interaction.data.options?.[0]
  if (sub?.type !== ApplicationCommandOptionType.Subcommand) return null
  return sub
}

const handleAlertsChannel: CommandHandler = async (interaction) => {
  const sub = getSubcommand(interaction)
  const channelOption = sub?.options?.find((o) => o.name === 'channel')
  const channelId =
    channelOption && 'value' in channelOption
      ? String(channelOption.value)
      : null

  //* required: true on the option means Discord won't let this fire
  //* without a channel — this check is a defensive fallback, not the
  //* primary guard, same posture as price.ts's query check.
  if (!channelId) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: 'Please provide a channel.',
      },
    }
  }

  const guildId = getInteractionGuildId(interaction)
  await upsertGuildChannel(guildId, channelId)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content: `✅ Sale alerts will now be posted in <#${channelId}>.`,
    },
  }
}

const handleRemoveAlerts: CommandHandler = async (interaction) => {
  const guildId = getInteractionGuildId(interaction)
  const existing = await getGuildByGuildId(guildId)

  if (!existing) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: "This server doesn't have any alert configuration to remove.",
      },
    }
  }

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: {
      flags: MessageFlags.Ephemeral,
      content:
        "⚠️ This will stop sale and free-game alerts for this server by removing its configured alert channel. You'll need to run `/config alerts-channel` again to set it back up. Are you sure?",
      components: [buildRemoveAlertsConfirmButtons()],
    },
  }
}

export const config: CommandHandler = (interaction) => {
  const sub = getSubcommand(interaction)
  if (!sub) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: { flags: MessageFlags.Ephemeral, content: 'Unknown subcommand.' },
    }
  }
  if (sub.name === 'alerts-channel') return handleAlertsChannel(interaction)
  if (sub.name === 'remove-alerts') return handleRemoveAlerts(interaction)

  return {
    type: InteractionResponseType.ChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral, content: 'Unknown subcommand.' },
  }
}
