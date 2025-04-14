import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { ANIME, SubOrSub } from '@consumet/extensions';
import { StreamingServers } from '@consumet/extensions/dist/models';
import cache from '../../utils/cache';
import { redis } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const gogoanime = new ANIME.Gogoanime(process.env.GOGOANIME_URL);
  let baseUrl = 'https://animekai.to';
  if (process.env.GOGOANIME_URL) {
    baseUrl = `https://${process.env.GOGOANIME_URL}`;
  }

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the gogoanime provider: check out the provider's website @ ${baseUrl}`,
      routes: [
        '/:query',
        '/latest-completed',
        '/new-releases',
        '/recent-added',
        '/recent-episodes',
        '/schedule/:date',
        '/spotlight',
        '/search-suggestions/:query',
        '/info',
        '/watch/:episodeId',
        '/genre/list',
        '/genre/:genre',
        '/movies',
        '/ona',
        '/ova',
        '/specials',
        '/tv',
      ],
      documentation: 'https://docs.consumet.org/#tag/gogoanime',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = (request.query as { page: number }).page;
    const res = await gogoanime.search(query, page);
    reply.status(200).send(res);
  });

  fastify.get('/latest-completed', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchLatestCompleted(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/new-releases', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchNewReleases(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/recent-added', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchRecentlyAdded(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/recent-episodes', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchRecentlyUpdated(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/schedule/:date', async (request, reply) => {
    const date = (request.params as { date: string }).date;
    try {
      const res = await gogoanime.fetchSchedule(date);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/spotlight', async (_, reply) => {
    try {
      const res = await gogoanime.fetchSpotlight();
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/search-suggestions/:query', async (request, reply) => {
    const query = (request.params as { query: string }).query;
    if (!query) return reply.status(400).send({ message: 'query is required' });

    try {
      const res = await gogoanime.fetchSearchSuggestions(query);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/info', async (request, reply) => {
    const id = (request.query as { id: string }).id;
    if (!id) return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await gogoanime.fetchAnimeInfo(id).catch(err => reply.status(404).send({ message: err }));
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/watch/:episodeId', async (request, reply) => {
    const episodeId = (request.params as { episodeId: string }).episodeId;
    const server = (request.query as { server: string }).server as StreamingServers;
    let dub = (request.query as { dub?: string | boolean }).dub;
    dub = dub === 'true' || dub === '1';

    if (!episodeId) return reply.status(400).send({ message: 'id is required' });
    if (server && !Object.values(StreamingServers).includes(server))
      return reply.status(400).send({ message: 'server is invalid' });

    try {
      const res = await gogoanime
        .fetchEpisodeSources(episodeId, server, dub ? SubOrSub.DUB : SubOrSub.SUB)
        .catch(err => reply.status(404).send({ message: err }));
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/servers/:episodeId', async (request, reply) => {
    const episodeId = (request.params as { episodeId: string }).episodeId;
    let dub = (request.query as { dub?: string | boolean }).dub;
    dub = dub === 'true' || dub === '1';

    if (!episodeId) return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await gogoanime
        .fetchEpisodeServers(episodeId, dub ? SubOrSub.DUB : SubOrSub.SUB)
        .catch(err => reply.status(404).send({ message: err }));
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/genre/list', async (_, reply) => {
    try {
      const res = await gogoanime.fetchGenres();
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/genre/:genre', async (request, reply) => {
    const genre = (request.params as { genre: string }).genre;
    const page = (request.query as { page: number }).page;
    if (!genre) return reply.status(400).send({ message: 'genre is required' });

    try {
      const res = await gogoanime.genreSearch(genre, page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/movies', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchMovie(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/ona', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchONA(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/ova', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchOVA(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/specials', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchSpecial(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/tv', async (request, reply) => {
    const page = (request.query as { page: number }).page;
    try {
      const res = await gogoanime.fetchTV(page);
      reply.status(200).send(res);
    } catch {
      reply.status(500).send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });
};

export default routes;
