import { links } from '../data/profile.ts'
import { Section } from './Section.tsx'

export function Links() {
  return (
    <Section title="Links">
      <ul className="links">
        {links.map((link) => (
          <li key={link.platform}>
            <a href={link.url} rel="me">
              <span className="platform">{link.platform}</span>
              <span className="handle">{link.handle}</span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
