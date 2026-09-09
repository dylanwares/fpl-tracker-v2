/**
 * Official Premier League artwork.
 *
 * Both CDNs are the ones fantasy.premierleague.com serves its own site from,
 * and both are keyed by the *team code* (stable across seasons) rather than the
 * team id (which is reassigned each year as clubs come up and go down).
 *
 * Nothing is vendored into the repo — if these ever move, every image falls
 * back to a colour chip rather than breaking the layout.
 */

/** Outfield and goalkeeper kits differ; GK shirts take a `_1` suffix. */
export function shirtUrl(teamCode: number, isKeeper: boolean, size: 66 | 110 = 110): string {
  const variant = isKeeper ? `${teamCode}_1` : `${teamCode}`;
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${variant}-${size}.png`;
}

export function badgeUrl(teamCode: number, size: 50 | 70 = 70): string {
  return `https://resources.premierleague.com/premierleague/badges/${size}/t${teamCode}.png`;
}
