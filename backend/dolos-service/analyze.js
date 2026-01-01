import { Dolos } from '@dodona/dolos-lib';
import fs from 'fs/promises';
import path from 'path';

async function run() {
    try {
        const args = process.argv.slice(2);
        if (args.length < 2) {
            console.error('Usage: node analyze.js <file1> <file2> ...');
            process.exit(1);
        }

        const dolos = new Dolos();
        const report = await dolos.analyzePaths(args);
        const pairs = report.allPairs();

        const results = [];

        for (const pair of pairs) {
            // console.log('Pair keys:', Object.keys(pair));
            // console.log('Pair:', pair);
            
            let fragments = [];
            if (pair.buildFragments) {
                 fragments = pair.buildFragments();
            } else if (typeof pair.fragments === 'function') {
                 fragments = pair.fragments();
            } else if (pair.fragments) {
                 fragments = pair.fragments;
            }
            
            // If fragments is a Promise?
            if (fragments instanceof Promise) {
                fragments = await fragments;
            }

            const mappedFragments = (fragments || []).map(f => ({
                left: {
                    startRow: f.leftSelection.startRow,
                    startCol: f.leftSelection.startCol,
                    endRow: f.leftSelection.endRow,
                    endCol: f.leftSelection.endCol,
                },
                right: {
                    startRow: f.rightSelection.startRow,
                    startCol: f.rightSelection.startCol,
                    endRow: f.rightSelection.endRow,
                    endCol: f.rightSelection.endCol,
                }
            }));

            results.push({
                leftFile: pair.leftFile.path,
                rightFile: pair.rightFile.path,
                similarity: pair.similarity,
                totalOverlap: pair.totalOverlap,
                fragments: fragments
            });
        }

        console.log(JSON.stringify(results, null, 2));

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

run();
