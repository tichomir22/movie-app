export default class MovieServise {
  constructor() {
    this.baseURL = 'https://api.themoviedb.org/3'
    this.apiKey = '60cd649999f3bfe75d6fa605a6795558'

    this.headers = {
      'Content-Type': 'application/json;charset=utf-8',
    }

    this.getFetchOptions = {
      method: 'GET',
      headers: this.headers,
      redirect: 'follow',
    }
  }

  static formatMovies = (data) => {
    const movies = {
      byId: data.results.reduce((acc, movie) => {
        acc[movie.id] = {
          id: movie.id,
          title: movie.original_title,
          releaseDate: movie.release_date,
          description: movie.overview,
          posterSrc: movie.poster_path,
          genresIds: movie.genre_ids,
          voteAverage: +movie.vote_average.toFixed(1),
          rating: movie.rating,
        }
        return acc
      }, {}),
      allIds: data.results.reduce((acc, movie) => {
        acc.push(movie.id)
        return acc
      }, []),
    }
    return {
      movies,
      totalResults: data.total_results,
      totalPages: data.total_pages,
    }
  }

  fetchJsonData = async (url) => {
    const res = await fetch(`${this.baseURL}${url}`)
    if (!res.ok) {
      throw new Error(`${res.status}`)
    }
    const body = await res.json()
    return body
  }

  searchMovie = async (page, query) => {
    const url = `/search/movie?api_key=${this.apiKey}&query=${query}&page=${page}`
    const body = await this.fetchJsonData(url)
    return MovieServise.formatMovies(body)
  }

  getPopularMovie = async (page) => {
    const url = `/movie/popular?api_key=${this.apiKey}&language=en-US&page=${page}`
    const body = await this.fetchJsonData(url)
    return MovieServise.formatMovies(body)
  }

  setGuestSesion = async () => {
    const oldGuestSessionId = localStorage.getItem('sessionId')
    let newGuestSessionId = ''
    if (oldGuestSessionId !== null) {
      if (this.checkGuestSesion(oldGuestSessionId)) {
        newGuestSessionId = oldGuestSessionId
      }
    } else {
      const body = await this.fetchJsonData(`/authentication/guest_session/new?api_key=${this.apiKey}`)
      localStorage.clear()
      newGuestSessionId = body.guest_session_id
      localStorage.setItem('sessionId', newGuestSessionId)
    }
    return newGuestSessionId
  }

  checkGuestSesion = async (sessionId) => {
    const url = `/guest_session/${sessionId}?api_key=${this.apiKey}`
    const body = await this.fetchJsonData(url)
    return body.success
  }

  getRatedMoviesGuestSession = async (sessionId, page = 1) => {
    const url = `/guest_session/${sessionId}/rated/movies?api_key=${this.apiKey}&page=${page}`
    const body = await this.fetchJsonData(url)
    return MovieServise.formatMovies(body)
  }

  getAllMoviesRatingGuestSession = async (sessionId) => {
    function MakeRatingObject({ byId, allIds }) {
      return allIds.reduce((acc, id) => {
        acc[id] = byId[id].rating
        return acc
      }, {})
    }

    let res = {}
    let body = await this.getRatedMoviesGuestSession(sessionId, 1)
    const { totalPages, totalResults, movies } = body

    if (!totalResults) return res

    res = MakeRatingObject(movies)

    if (totalPages === 1) return res

    for (let i = 2; i <= totalPages; i++) {
      // eslint-disable-next-line no-await-in-loop
      body = await this.getRatedMoviesGuestSession(sessionId, i)
      res = { ...res, ...MakeRatingObject(body.movies) }
    }
    return res
  }

  setRatingGuest = async (sessionId, movieId, rateValue) => {
    const url = `/movie/${movieId}/rating?api_key=${this.apiKey}&guest_session_id=${sessionId}`
    const res = await fetch(`${this.baseURL}${url}`, {
      method: 'POST',
      headers: {
        'Content-type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify({
        value: rateValue,
      }),
    })
    const body = await res.json()
    return body
  }

  getGenres = async () => {
    const url = `/genre/movie/list?api_key=${this.apiKey}`
    const body = await this.fetchJsonData(url)
    const genres = body.genres.reduce((acc, cur) => {
      const { id, name } = cur
      acc[id] = name
      return acc
    }, {})
    return genres
  }
}
