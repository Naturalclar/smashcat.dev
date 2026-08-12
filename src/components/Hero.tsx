import { avatar, name, tagline } from '../data/profile.ts'

export function Hero() {
  return (
    <header className="hero">
      <img
        className="avatar"
        src={avatar}
        alt={`${name} のアバター`}
        width={128}
        height={128}
      />
      <div>
        <h1>{name}</h1>
        <p>{tagline}</p>
      </div>
    </header>
  )
}
