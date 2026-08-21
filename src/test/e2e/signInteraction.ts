import nacl from 'tweetnacl'

// Generate once, hardcode both halves — this is a test-only keypair,
// not a real Discord app's key. Public half goes in DISCORD_PUBLIC_KEY
// for the e2e test env; private half signs requests here.
const TEST_KEYPAIR = nacl.sign.keyPair()
export const TEST_PUBLIC_KEY = Buffer.from(TEST_KEYPAIR.publicKey).toString(
  'hex'
)

export const signInteractionBody = (body: unknown) => {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const bodyStr = JSON.stringify(body)
  const message = Buffer.from(timestamp + bodyStr)
  const signature = nacl.sign.detached(message, TEST_KEYPAIR.secretKey)

  return {
    bodyStr,
    headers: {
      'x-signature-ed25519': Buffer.from(signature).toString('hex'),
      'x-signature-timestamp': timestamp,
    },
  }
}

export const buildSignedRequest = (url: string, body: unknown) => {
  const { bodyStr, headers } = signInteractionBody(body)
  return new Request(url, { method: 'POST', headers, body: bodyStr })
}
