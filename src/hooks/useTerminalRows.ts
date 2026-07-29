import { useEffect, useState } from 'react';
import { useStdout } from 'ink';

const DEFAULT_TERMINAL_ROWS = 24;

export function useTerminalRows(): number {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(() => getRows(stdout));

  useEffect(() => {
    const updateRows = () => setRows(getRows(stdout));
    stdout.on('resize', updateRows);
    return () => {
      stdout.off('resize', updateRows);
    };
  }, [stdout]);

  return rows;
}

function getRows(stdout: NodeJS.WriteStream): number {
  return Math.max(stdout.rows || DEFAULT_TERMINAL_ROWS, 2);
}
