import { createApp } from './create-app'
import { Application } from 'express'

const app: Application = createApp()
const PORT: number | string = process.env.PORT || 8787

app.listen(PORT, () => {
    console.log(`Listening to port: ${PORT}`)
})