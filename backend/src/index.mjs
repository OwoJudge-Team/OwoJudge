import { createApp } from './create-app.mjs'

const app = createApp()
const PORT = process.env.PORT || 8787

app.listen(PORT, () => {
    console.log(`Listening to port: ${PORT}`)
})