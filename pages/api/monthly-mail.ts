import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';
import { ServerClient } from 'postmark';

const mailClient = new ServerClient(process.env.POSTMARK_API);

type ResData = {
  result: string;
};

export default async (req: NextApiRequest, res: NextApiResponse<ResData>) => {
  // if (req.headers.authorization !== `Bearer ${process.env.AUTH_SECRET}`) {
  //   res.status(403).send({ result: 'Authorization error' });
  //   return;
  // }
  const table = new Airtable({ apiKey: process.env.AIRTABLE_API })
    .base(process.env.AIRTABLE_BASE)
    .table(process.env.AIRTABLE_TABLE);

  const records = await table.select({ fields: ['First Name', 'Email'] });

  records.eachPage(
    async function page(records, fetchNextPage) {
      for await (const record of records) {
        console.log('Retrieved', record.get('First Name'));
        const id = record.getId();
        mailClient.sendEmailWithTemplate({
          From: process.env.POSTMARK_FROM,
          To: record.get('Email').toString(),
          TemplateAlias: 'monthly-availability',
          TemplateModel: {
            name: record.get('First Name'),
            month: 'June',
            action_url_0: `${process.env.VERCEL_URL}/message?user=${id}&availability=0`,
            action_url_10: `${process.env.VERCEL_URL}/message?user=${id}&availability=10`,
            action_url_20: `${process.env.VERCEL_URL}/message?user=${id}&availability=20`,
            action_url_30: `${process.env.VERCEL_URL}/message?user=${id}&availability=30`,
            action_url_40: `${process.env.VERCEL_URL}/message?user=${id}&availability=40`,
          },
          MessageStream: 'monthly-availability',
        });
      }

      fetchNextPage();
    },
    function done(err) {
      if (err) {
        console.error(err);
        res.status(500).send({ result: 'Error' });
        return;
      }
    }
  );

  res.status(200).json({ result: 'ok' });
};