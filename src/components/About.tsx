import { about } from '../data/profile.ts'
import { Section } from './Section.tsx'

export function About() {
  // 本文が無いときは見出しだけが残らないよう、セクションごと出さない。
  if (about.length === 0) return null

  return (
    <Section title="About">
      {about.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </Section>
  )
}
