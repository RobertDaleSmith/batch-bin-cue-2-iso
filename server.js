const forEachAsync = require('foreachasync').forEachAsync;
const glob = require('glob');
const shell = require('shelljs');

const GAMES_PATH = '/volumes/3DO';

function getDirectories(src, callback) { return glob(src + '/**/*.*', callback) };

getDirectories(GAMES_PATH, async function (err, files) {
    if (err) {
        console.log('Error', err);
        return;
    }

    const games = {};
    const binCueGames = [];

    files.forEach(fileName => {
        const name = fileName.split('.')[0];
        const ext = fileName.split('.').pop();

        if (!games[name]) {
            games[name] = { name };
        }

        if (ext === 'bin') games[name].bin = fileName;
        else if (ext === 'cue') games[name].cue = fileName;
        else if (ext === 'iso') games[name].converted = true;
        else games[name].invalid = true;
    });

    Object.keys(games).forEach(name => {
        if (
            games[name].cue &&
            games[name].bin &&
            games[name].converted !== true &&
            games[name].invalid !== true
        ) {
            binCueGames.push(games[name]);
        }
    });

    console.log(`${binCueGames.length} games to be converted from BIN/CUE to ISO`);

    let converted = 0;
    let fails = 0;

    // loops out games to console log
    forEachAsync(binCueGames, async game => {
        const name = game.name.split('/').pop();

        console.log(`CONVERTING: ${name}.bin/cue to ISO...`);

        const result = await shell.exec(`bchunk "${game.bin}" "${game.cue}" "${game.name}.iso"`);
        const success = result.stdout.indexOf('100 %') !== -1 && result.stdout.indexOf('0/0') === -1;

        if (success) {
            shell.exec(`mv "${game.name}.iso01.iso" "${game.name}.iso"`);
            shell.exec(`rm -rf "${game.bin}"`);
            shell.exec(`rm -rf "${game.cue}"`);

            console.log(`COMPLETED: ${name}.iso`);
            converted++;
        } else {
            console.log(`FAILED: ${name}.bin/cue`);
            fails++;
        }

        console.log(`CONVERTED (${converted} / ${binCueGames.length})`);
        console.log(`${fails} FAILS`);
    }).then(function () {
        // then after all of the elements have been handled
        // the final callback fires to let you know it's all done
        console.log('All requests have finished');
    });

});
