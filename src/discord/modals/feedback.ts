import {
  InteractionResponseType,
  MessageFlags,
  ComponentType,
} from 'discord-api-types/v10'
import type { APIModalSubmitInteraction } from 'discord-api-types/v10'
import { after } from 'next/server'
import type { ModalHandler } from '@/types'
import {
  postChannelMessage,
  postChannelMessageWithFile,
  editOriginalInteractionResponse,
} from '@/discord/rest'
import { getInteractionUserId } from '@/discord/interactions/getInteractionUserId'
import { FEEDBACK_CATEGORIES } from '@/discord/interactions/buildFeedbackModal'
import { findLabelComponent } from './shared'

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  FEEDBACK_CATEGORIES.map((c) => [c.value, `${c.emoji.name} ${c.label}`])
)

export const handleFeedbackModalSubmit: ModalHandler = async (interaction) => {
  const { components, resolved } = interaction.data
  const category = findLabelComponent(components, 'feedback_category')
  const textInput = findLabelComponent(components, 'feedback_text')
  const screenshot = findLabelComponent(components, 'feedback_screenshot')

  const categoryValue =
    category && category.type === ComponentType.StringSelect
      ? category.values[0]
      : undefined
  const feedbackText =
    textInput && textInput.type === ComponentType.TextInput
      ? textInput.value?.trim()
      : undefined

  if (!categoryValue || !feedbackText) {
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: '⚠️ Something went wrong — try `/feedback` again.',
      },
    }
  }

  const channelId = process.env.FEEDBACK_CHANNEL_ID
  if (!channelId) {
    console.error('FEEDBACK_CHANNEL_ID is not set — feedback dropped')
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: "⚠️ Feedback couldn't be delivered — please try again later.",
      },
    }
  }

  const discordId = getInteractionUserId(interaction)
  const origin = interaction.guild_id ? `guild ${interaction.guild_id}` : 'DM'
  const attachmentId =
    screenshot && screenshot.type === ComponentType.FileUpload
      ? screenshot.values?.[0]
      : undefined
  const attachment = attachmentId
    ? resolved?.attachments?.[attachmentId]
    : undefined

  const embed = {
    title: CATEGORY_LABELS[categoryValue] ?? categoryValue,
    description: `${feedbackText}\n\n-# Submitted by <@${discordId}>`,
    color: 0x5865f2,
    footer: { text: `${discordId} · ${origin}` },
    timestamp: new Date().toISOString(),
  }

  //* No screenshot — a single plain-JSON post comfortably fits inside
  //* Discord's 3-second ACK window, so respond directly like every
  //* other handler in this codebase.
  if (!attachment) {
    await postChannelMessage(channelId, { embeds: [embed] })
    return {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: {
        flags: MessageFlags.Ephemeral,
        content: '✅ Thanks — your feedback has been sent!',
      },
    }
  }

  //* Screenshot present — fetching it off Discord's CDN plus re-uploading
  //* as multipart risks exceeding the 3-second window, so ack immediately
  //* with a defer and do the real work via after(), editing the deferred
  //* response once it's actually done.
  const interactionToken = interaction.token
  after(async () => {
    try {
      const fileRes = await fetch(attachment.url)
      if (fileRes.ok) {
        const data = await fileRes.arrayBuffer()
        await postChannelMessageWithFile(
          channelId,
          {
            embeds: [
              {
                ...embed,
                image: { url: `attachment://${attachment.filename}` },
              },
            ],
          },
          {
            filename: attachment.filename,
            data,
            contentType: attachment.content_type,
          }
        )
      } else {
        console.error(`Feedback screenshot fetch failed: ${fileRes.status}`)
        await postChannelMessage(channelId, { embeds: [embed] }) //* text still delivered even if the image fetch fails
      }
      await editOriginalInteractionResponse(interactionToken, {
        content: '✅ Thanks — your feedback has been sent!',
      })
    } catch (err) {
      console.error('Deferred feedback handling failed:', err)
      await editOriginalInteractionResponse(interactionToken, {
        content: '⚠️ Something went wrong sending that — please try again.',
      }).catch(() => {})
    }
  })

  return {
    type: InteractionResponseType.DeferredChannelMessageWithSource,
    data: { flags: MessageFlags.Ephemeral },
  }
}
