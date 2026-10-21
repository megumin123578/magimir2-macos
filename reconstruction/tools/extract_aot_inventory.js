const fs = require('fs');
const path = require('path');

function asciiStrings(buffer, minimumLength = 5) {
  const result = [];
  let current = '';
  for (let index = 0; index <= buffer.length; index += 1) {
    const value = index < buffer.length ? buffer[index] : 0;
    if (value >= 0x20 && value <= 0x7e) {
      current += String.fromCharCode(value);
    } else {
      if (current.length >= minimumLength) result.push(current);
      current = '';
    }
  }
  return result;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function featureForRoute(route) {
  const rules = [
    ['authentication', /\/auth\/|\/logout$|\/kickOut$/],
    ['seat-management', /\/seat\//],
    ['preset-and-color', /\/filter\/|\/preset\/mark/],
    ['retouch-and-billing', /\/retouch\/|\/bill\/|RechargeBill/],
    ['creative-ai', /\/creative\//],
    ['feedback', /issueFeedback/],
    ['backgrounds', /\/background\//],
    ['subscription-and-orders', /\/subscription\/|\/order\//],
    ['uploads', /qiniu/i],
    ['content-and-guides', /content-configurations|\/guide\//],
    ['merchant-profile', /\/photo\/user\/|MerchantCenter/],
  ];
  return (rules.find(([, pattern]) => pattern.test(route)) || ['unclassified'])[0];
}

function moduleForPackage(packagePath) {
  const match = packagePath.match(/^package:magic_mirror_flutter\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

function main() {
  const inputPath = path.resolve(process.argv[2] || '');
  const outputPath = path.resolve(process.argv[3] || '');
  if (!process.argv[2] || !process.argv[3]) {
    throw new Error('Usage: node extract_aot_inventory.js <App binary> <output JSON>');
  }

  const strings = asciiStrings(fs.readFileSync(inputPath));
  const routes = uniqueSorted(strings.filter((value) => value.startsWith('/hms/')));
  const packagePaths = uniqueSorted(
    strings.filter((value) => /^package:magic_mirror_flutter\/.+\.dart\d*$/.test(value)),
  );

  const routeGroups = {};
  for (const route of routes) {
    const feature = featureForRoute(route);
    (routeGroups[feature] ||= []).push(route);
  }

  const packageGroups = {};
  for (const packagePath of packagePaths) {
    const moduleName = moduleForPackage(packagePath);
    (packageGroups[moduleName] ||= []).push(packagePath);
  }

  const inventory = {
    schemaVersion: 1,
    source: {
      artifact: inputPath,
      extraction: 'Printable ASCII strings (minimum length 5) from Flutter AOT Mach-O',
      limitations: [
        'Static string presence does not prove that a route is reachable at runtime.',
        'HTTP methods, headers, request bodies, response schemas, and authorization rules are not established.',
        'Trailing digits on some Dart paths are preserved because they are present in the shipped binary.',
        'No embedded secrets or key material are included in this inventory.',
      ],
    },
    counts: {
      printableStrings: strings.length,
      apiRoutes: routes.length,
      dartPackagePaths: packagePaths.length,
    },
    routes,
    routeGroups,
    packagePaths,
    packageGroups,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote ${routes.length} routes and ${packagePaths.length} Dart paths to ${outputPath}\n`);
}

main();
