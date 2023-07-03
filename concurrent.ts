import React from 'react';
import { useTable } from 'react-table';
import { Table, Column, AutoSizer } from 'react-virtualized';

const VirtualizedTable = ({ data }) => {
  const columns = React.useMemo(
    () => [
      // Define your columns here
      // Example:
      {
        Header: 'Name',
        accessor: 'name',
      },
      {
        Header: 'Age',
        accessor: 'age',
      },
      // Add more columns as needed
    ],
    []
  );

  const tableInstance = useTable({
    columns,
    data,
  });

  const { getTableProps, getTableBodyProps, headerGroups, rows, prepareRow } =
    tableInstance;

  return (
    <AutoSizer>
      {({ width, height }) => (
        <Table
          {...getTableProps()}
          width={width}
          height={height}
          headerHeight={30}
          rowHeight={30}
          rowCount={rows.length}
          rowGetter={({ index }) => rows[index]}
          rowRenderer={({ index, key, style }) => {
            const row = rows[index];
            prepareRow(row);

            return (
              <div key={key} style={style}>
                {row.cells.map((cell) => (
                  <div {...cell.getCellProps()}>{cell.render('Cell')}</div>
                ))}
              </div>
            );
          }}
        >
          {headerGroups.map((headerGroup) => (
            <Column
              key={headerGroup.id}
              header={headerGroup.headers[0].render('Header')}
              dataKey={headerGroup.headers[0].id}
              width={150}
            />
          ))}
        </Table>
      )}
    </AutoSizer>
  );
};

export default VirtualizedTable;
