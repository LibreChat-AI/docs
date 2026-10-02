import { Callout } from 'fumadocs-ui/components/callout'

/**
 * Shown at the top of every archived docs page. `currentHref` is the same slug
 * on the live docs when it still exists, otherwise the live docs root. The
 * newest release is still what most deployments run, so it is introduced as
 * the latest release rather than as frozen, unmaintained docs.
 */
export function ArchivedVersionBanner({
  version,
  currentHref,
  latestRelease = false,
}: {
  version: string
  currentHref: string
  latestRelease?: boolean
}) {
  if (latestRelease) {
    return (
      <Callout type="info" title="Latest release">
        <p className="m-0">
          You are reading the documentation for <strong>{version}</strong>, the latest release. The
          main docs follow the development branch and can describe features that are not released
          yet.{' '}
          <a href={currentHref} className="font-medium underline">
            Go to the latest docs
          </a>
          .
        </p>
      </Callout>
    )
  }

  return (
    <Callout type="warn" title="Archived documentation">
      <p className="m-0">
        You are reading the frozen documentation for <strong>{version}</strong>, which is no longer
        maintained.{' '}
        <a href={currentHref} className="font-medium underline">
          Go to the latest docs
        </a>
        .
      </p>
    </Callout>
  )
}
