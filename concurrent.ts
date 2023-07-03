import React from 'react';
import { useTable } from 'react-table';
import { Table, Column, AutoSizer } from 'react-virtualized';
import { Table as BootstrapTable } from 'react-bootstrap';

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
        <BootstrapTable responsive striped bordered hover {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup) => (
              <tr {...headerGroup.getHeaderGroupProps()}>
                {headerGroup.headers.map((column) => (
                  <th {...column.getHeaderProps()}>{column.render('Header')}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map((row) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map((cell) => (
                    <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </BootstrapTable>
      )}
    </AutoSizer>
  );
};

export default VirtualizedTable;
