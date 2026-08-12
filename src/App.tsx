import { About } from './components/About.tsx'
import { FanArtGallery } from './components/FanArtGallery.tsx'
import { Hero } from './components/Hero.tsx'
import { Links } from './components/Links.tsx'
import { Tools } from './components/Tools.tsx'

export function App() {
  return (
    <>
      <div className="wrap">
        <Hero />
        <About />
        <Links />
        <FanArtGallery />
        <Tools />
      </div>
      <footer>
        <div className="wrap">
          <a href="https://naturalclar.dev/">naturalclar.dev</a>
        </div>
      </footer>
    </>
  )
}
