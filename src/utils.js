const is = require('check-more-types');
const la = require('lazy-ass')
const { join } = require('path')
const { existsSync } = require('fs')

/**
 * Returns the host to ping if the user specified just the port.
 * For a long time, the safest bet was "localhost", but now modern
 * web servers seem to bind to "0.0.0.0", which means
 * the "127.0.0.1" works better
 */
const getHost = () => '127.0.0.1';

const normalizeUrl = (s) => {
  const defaultHost = getHost();

  if (is.url(s)) {
    return s
  }

  if (is.number(s) && is.port(s)) {
    return `http://${defaultHost}:${s}`
  }

  if (!is.string(s)) {
    return s
  }

  if (
    s.startsWith('localhost') ||
    s.startsWith('127.0.0.1') ||
    s.startsWith('0.0.0.0')
  ) {
    return `http://${s}`
  }

  if (is.port(parseInt(s))) {
    return `http://${defaultHost}:${s}`
  }

  if (s[0] === ':') {
    return `http://${defaultHost}${s}`
  }
  // for anything else, return original argument
  return s
}

/**
 * Returns true if the given string is a name of a script in the package.json file
 * in the current working directory
 */
const isPackageScriptName = command => {
  la(is.unemptyString(command), 'expected command name string', command)

  const packageFilename = join(process.cwd(), 'package.json')
  if (!existsSync(packageFilename)) {
    return false
  }
  const packageJson = require(packageFilename)
  if (!packageJson.scripts) {
    return false
  }
  return Boolean(packageJson.scripts[command])
}

const isUrlOrPort = s => {

  if (is.url(s)) {
    return s
  }

  if (is.number(s)) {
    return is.port(s)
  }
  if (!is.string(s)) {
    return false
  }
  if (s[0] === ':') {
    const withoutColon = s.substr(1)
    return is.port(parseInt(withoutColon))
  }

  return is.port(parseInt(s))
}

/**
 * Returns parsed command line arguments.
 * If start command is NPM script name defined in the package.json
 * file in the current working directory, returns 'npm run start' command.
 */
const getArguments = cliArgs => {
  la(is.strings(cliArgs), 'expected list of strings', cliArgs)

  let start = 'start'
  let url;

  if (cliArgs.length === 1 && isUrlOrPort(cliArgs[0])) {
    // passed just single url or port number, for example
    // "start": "http://localhost:8080"
    url = normalizeUrl(cliArgs[0])
  } else if (cliArgs.length === 2 && isUrlOrPort(cliArgs[1])) {
    // passed start command and url/port
    // like "start-server 8080"
    start = cliArgs[0]
    url = normalizeUrl(cliArgs[1])
  } else {
    la(
      cliArgs.length === 2,
      'expected <NPM script name that starts server> <url or port>\n',
      'example: wait-umi start 8080\n',
    )
    start = cliArgs[0]
    url = normalizeUrl(cliArgs[1])
  }

  start = isPackageScriptName(start)
    ? `npm run ${start}`
    : start

  return {
    start,
    url
  }
}

module.exports = {
  normalizeUrl,
  getArguments,
};