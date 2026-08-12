import { tools } from '../data/profile.ts'
import { Section } from './Section.tsx'

export function Tools() {
  return (
    <Section title="Tools">
      <ul className="tools">
        {tools.map((tool) => (
          <li key={tool.href}>
            <a className="tool" href={tool.href}>
              <span className="name">{tool.name}</span>
              <p className="desc">{tool.description}</p>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  )
}
