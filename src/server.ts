import express, {json} from 'express';
import {slashCmdAuth} from './server/auth';
import {handleCommands} from './server/handleCommands';

const PORT = 8080;
const PUBLIC_KEY = process.env.PUBLIC_KEY!;

const app = express();

app.use(json());

app.use('/cmds', slashCmdAuth({PUBLIC_KEY}));

app.post('/cmds', handleCommands);

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
