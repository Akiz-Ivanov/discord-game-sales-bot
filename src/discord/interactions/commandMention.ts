import { COMMAND_IDS } from '@/discord/commandIds'

//* Renders as a clickable command mention — clicking it inserts the
//* command scaffold (e.g. "/price ") into the chatbox, cursor ready.
//* Discord has no way to pre-fill a parameter value through this syntax,
//* only the command scaffold up to the subcommand.
export const mention = (name: keyof typeof COMMAND_IDS, subcommand?: string) =>
  `</${subcommand ? `${name} ${subcommand}` : name}:${COMMAND_IDS[name]}>`
