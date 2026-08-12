import { fanArt } from '../data/profile.ts'
import { Section } from './Section.tsx'

export function FanArtGallery() {
  return (
    <Section title="Fan Art">
      {fanArt.length === 0 ? (
        <p className="empty">まだ掲載しているファンアートはありません。</p>
      ) : (
        <div className="gallery">
          {fanArt.map((art) => (
            <figure className="art" key={art.src}>
              <img
                src={art.src}
                alt={art.caption ?? `ファンアート（作者: ${art.artist}）`}
                loading="lazy"
                width={400}
                height={400}
              />
              <figcaption>
                by{' '}
                <a href={art.artistUrl} rel="noopener noreferrer" target="_blank">
                  {art.artist}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <p className="note">
        掲載しているファンアートの著作権は各作者にあります。掲載は作者の許諾を得た
        ものに限ります。削除のご希望は各SNSのDMまでご連絡ください。
      </p>
    </Section>
  )
}
