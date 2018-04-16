### KTH StudAdm Ladok API Client
This Ladok API Client contains some support for
using the Ladok API using relation links.

## Usage

```
import { createLadokApiClient } from 'kth-studadm-ladok-client'

const ladokApiClient = createLadokApiClient({
  baseUrl: <the base url of the ladok api>,
  sslOptions: {
    pfx: Buffer.from(<your pfx in as a base64 string>, 'base64'),
    passphrase: <passphrase for the pfx file>
  }
})

const searchLink = await ladokApiClient.findIndexLink(aktivitetstillfalleFiltreraRel)
const result = await ladokApiClient.followLink(searchLink, {
  queryParams: {
    kurskod: 'SOMECODE',
    ...
  }
})
```

## License

The MIT License (MIT)

Copyright (c) 2018 KTH Royal Institute of Technology

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.