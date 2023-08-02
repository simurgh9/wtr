// If you are not using the default export, you must use curly braces.
import { createRoot } from 'react-dom/client'
import Root from './Root.jsx'
import Model from './Model.jsx'
import Control from './Control.jsx'
import './css/broad.css'
import './css/details.css'
import './css/toggle.css'
import './css/mobile.css'

const model = new Model()
const control = new Control(model)
const view = <Root control={control} />
const container = document.getElementById('root')
const root = createRoot(container)
root.render(view)
