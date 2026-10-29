const ftp = require('basic-ftp');

async function compareDirs() {
  const c = new ftp.Client();
  try {
    await c.access({host:'10.0.0.2', user:'Naphat', password:'O@m11o1toolBox', secure:false});
    
    async function getTree(dirPath) {
      const result = {};
      async function walk(currentPath) {
        const list = await c.list(currentPath);
        for (const item of list) {
          if (item.name === '.' || item.name === '..') continue;
          const fullPath = currentPath + '/' + item.name;
          if (item.isDirectory) {
            await walk(fullPath);
          } else {
            result[fullPath] = { size: item.size, date: item.modifiedAt };
          }
        }
      }
      await walk(dirPath);
      return result;
    }

    console.log('Fetching tree for /MES/MES...');
    const prodTree = await getTree('/MES/MES');
    console.log('Fetching tree for /MES_TEST...');
    const testTree = await getTree('/MES_TEST');

    const prodKeys = Object.keys(prodTree).map(k => k.replace('/MES/MES', ''));
    const testKeys = Object.keys(testTree).map(k => k.replace('/MES_TEST', ''));

    const onlyInProd = prodKeys.filter(k => !testKeys.includes(k));
    const onlyInTest = testKeys.filter(k => !prodKeys.includes(k));
    
    const diffFiles = [];
    for (const key of testKeys) {
      if (prodKeys.includes(key)) {
        const pFile = prodTree['/MES/MES' + key];
        const tFile = testTree['/MES_TEST' + key];
        if (pFile.size !== tFile.size) {
          diffFiles.push({ file: key, prodSize: pFile.size, testSize: tFile.size });
        }
      }
    }

    console.log('\n--- RESULTS ---');
    console.log('Files only in PROD:', onlyInProd.length);
    if (onlyInProd.length > 0) console.log(onlyInProd.slice(0, 5).join(', ') + (onlyInProd.length > 5 ? '...' : ''));
    
    console.log('Files only in TEST:', onlyInTest.length);
    if (onlyInTest.length > 0) console.log(onlyInTest.join('\n'));

    console.log('Files with different sizes:', diffFiles.length);
    if (diffFiles.length > 0) {
      diffFiles.forEach(f => {
        console.log(`- ${f.file} (Prod: ${f.prodSize}b, Test: ${f.testSize}b)`);
      });
    }
    console.log('----------------');

  } catch (err) {
    console.error(err);
  } finally {
    c.close();
  }
}

compareDirs();
