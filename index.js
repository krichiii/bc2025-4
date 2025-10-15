import { Command } from 'commander';
import http from 'http';
import fs from 'fs/promises';
import { XMLBuilder } from 'fast-xml-parser';
import url from 'url';

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'input JSON file path')
  .requiredOption('-h, --host <host>', 'server host')
  .requiredOption('-p, --port <port>', 'server port')
  .configureOutput({
    outputError: (str, write) => {
      switch(true)
      {
        case (str.includes('--input')):
          write('please specify input file\n')
          break
        case (str.includes('--host')): 
          write('please specify server host\n')
          break
        case (str.includes('--port')):
          write('please specify server port\n')
          break
        default:
          write(str);
      }
    }
  });

program.parse(process.argv);
const options = program.opts();

const checkFile = async (path) => {
  try {
    await fs.access(path);
  } catch {
    console.error("cannot find input file");
    process.exit(1);
  }
};
await checkFile(options.input);

  const server = http.createServer(async (req, res) => {
    try {
      const parsedUrl = url.parse(req.url, true);
      const query = parsedUrl.query;

      const fileData = await fs.readFile(options.input, 'utf-8');
      const lines = fileData.trim().split('\n');
      const passengers = lines.map(line => JSON.parse(line));

      let filtered = passengers;
      if (query.survived === 'true') {
        filtered = filtered.filter(p => p.Survived === "1" || p.Survived === 1);
      }

      const xmlBuilder = new XMLBuilder({ ignoreAttributes: false, format: true });
      const xmlData = {
        passengers: {
          passenger: filtered.map(p => {
            const passengerObj = { Name: p.Name, Ticket: p.Ticket };
            if (query.age === 'true') passengerObj.Age = p.Age;
            return passengerObj;
          })
        }
      };

      const xml = xmlBuilder.build(xmlData);

      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
      res.end(xml);

    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server error: ' + err.message);
    }
  });

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}/`);
});
