import React from 'react';
import { Box, Text } from 'ink';

const LOGO_FALLBACK = ` ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░ 
  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░  
   ▒▒▒░ ▒▒▒░ ▒▒▒░   
   ▒▒▒░ ▒▒▒░ ▒▒▒░   
   ▒▒▒░ ▒▒▒░ ▒▒▒░   
   ▒▒▒░ ▒▒▒░ ▒▒▒░   
   ▒▒▒░ ▒▒▒░ ▒▒▒░   
  ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒░  
   ▒▒▒▒▒▒▒▒▒▒▒▒▒░░  `;

const LOGO_LINES = LOGO_FALLBACK.split('\n');
const LOGO_WIDTH = Math.max(...LOGO_LINES.map((line) => line.length));

export function AthenaLogo() {
  return (
    <Box width={LOGO_WIDTH} height={LOGO_LINES.length} flexShrink={0}>
      <Text color="#e1ce92">{LOGO_FALLBACK}</Text>
    </Box>
  );
}
