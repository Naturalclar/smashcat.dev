import { about } from '../data/profile.ts'
import { Section } from './Section.tsx'

export function About() {
  return (
    <Section title="About">
      {about.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </Section>
  )
}
