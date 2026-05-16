import { MUSIC_ORIGIN } from "./config.js";

// NetEase returns slightly different field names from search, album, and artist
// endpoints. Normalizers give every MCP tool a consistent output shape.
export function normalizeSong(song) {
  const artists = song.artists ?? song.ar ?? [];
  const album = song.album ?? song.al ?? {};
  return {
    id: song.id,
    name: song.name,
    artists: artists.map((artist) => artist.name).filter(Boolean),
    album: album.name ?? "",
    duration_ms: song.duration ?? song.dt ?? null,
    fee: song.fee ?? null,
    url: `${MUSIC_ORIGIN}/#/song?id=${song.id}`,
  };
}

export function normalizeSongDetail(song) {
  return {
    ...normalizeSong(song),
    aliases: song.alias ?? song.alia ?? [],
    album_id: song.album?.id ?? song.al?.id,
    mv_id: song.mvid ?? song.mv ?? 0,
    popularity: song.popularity ?? song.pop ?? undefined,
    copyright_id: song.copyrightId ?? undefined,
  };
}

export function normalizeAlbum(album) {
  const artists = album.artists ?? (album.artist ? [album.artist] : []);
  return {
    id: album.id,
    name: album.name,
    artists: artists.map((artist) => artist.name).filter(Boolean),
    publish_time: album.publishTime ? new Date(album.publishTime).toISOString().slice(0, 10) : undefined,
    song_count: album.size ?? null,
    paid: album.paid ?? undefined,
    url: `${MUSIC_ORIGIN}/#/album?id=${album.id}`,
  };
}

export function normalizePlaylist(playlist) {
  return {
    id: playlist.id,
    name: playlist.name,
    creator: playlist.creator?.nickname ?? playlist.creator?.userName,
    track_count: playlist.trackCount ?? playlist.trackIds?.length ?? null,
    play_count: playlist.playCount ?? null,
    subscribed_count: playlist.subscribedCount ?? null,
    cover_url: playlist.coverImgUrl ?? undefined,
    description: playlist.description ?? undefined,
    url: `${MUSIC_ORIGIN}/#/playlist?id=${playlist.id}`,
  };
}

export function normalizeArtist(artist) {
  return {
    id: artist.id,
    name: artist.name,
    aliases: artist.alias ?? artist.aliases ?? [],
    music_count: artist.musicSize ?? null,
    album_count: artist.albumSize ?? null,
    image_url: artist.img1v1Url ?? artist.picUrl ?? undefined,
    url: `${MUSIC_ORIGIN}/#/artist?id=${artist.id}`,
  };
}

export function normalizeComment(comment) {
  return {
    id: comment.commentId,
    user: comment.user?.nickname,
    liked_count: comment.likedCount ?? 0,
    time: comment.time ? new Date(comment.time).toISOString() : undefined,
    content: comment.content,
  };
}

export function fallbackAlbum(albumId) {
  return {
    id: albumId,
    url: `${MUSIC_ORIGIN}/#/album?id=${albumId}`,
  };
}

export function fallbackArtist(artistId) {
  return {
    id: artistId,
    url: `${MUSIC_ORIGIN}/#/artist?id=${artistId}`,
  };
}
