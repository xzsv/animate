import { GlobalRegistrator } from '@happy-dom/global-registrator'

// A real origin so DOM APIs behave in tests
GlobalRegistrator.register({ url: 'http://localhost/' })
