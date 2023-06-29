import React from 'react';
import { useTable, useBlockLayout } from 'react-table';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import useSWRInfinite from 'swr/infinite';
import axios from 'axios';
import { Table } from 'react-bootstrap';

interface Row {
  id: number;
  name: string;
  age: number;
  // ... Add other properties as needed
}

interface LargeTableProps {
  fetchData: (page: number) => Promise<Row[]>;
}

const PAGE_SIZE = 50; // Number of rows to fetch per page

const LargeTable: React.FC<LargeTableProps> = ({ fetchData }) => {
  const getKey = (pageIndex: number, previousPageData: Row[] | null) => {
    if (previousPageData && !previousPageData.length) return null; // End of data
    return `tableData-${pageIndex}`;
  };

  const { data: paginatedRows, error, size, setSize } = useSWRInfinite<Row[]>(getKey, fetchData);

  const rows = paginatedRows ? paginatedRows.flatMap(row => row) : [];

  const columns = React.useMemo(
    () => [
      { Header: 'Name', accessor: 'name' },
      { Header: 'Age', accessor: 'age' },
      // ... Add other columns as needed
    ],
    []
  );

  const tableInstance = useTable(
    {
      columns,
      data: rows,
      initialState: {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      },
    },
    useBlockLayout
  );

  const { getTableProps, getTableBodyProps, headerGroups, rows: tableRows, prepareRow } = tableInstance;

  const RenderRow: React.FC<{ index: number; style: React.CSSProperties }> = React.useCallback(
    ({ index, style }) => {
      const row = tableRows[index];
      prepareRow(row);
      return (
        <tr {...row.getRowProps()} style={style}>
          {row.cells.map(cell => (
            <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
          ))}
        </tr>
      );
    },
    [prepareRow, tableRows]
  );

  if (error) {
    return <div>Error loading table data.</div>;
  }

  const loadMore = () => {
    setSize(size + 1);
  };

  return (
    <Table {...getTableProps()} striped bordered hover>
      <thead>
        {headerGroups.map(headerGroup => (
          <tr {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map(column => (
              <th {...column.getHeaderProps()}>{column.render('Header')}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody {...getTableBodyProps()}>
        <AutoSizer>
          {({ height, width }) => (
            <InfiniteLoader
              isItemLoaded={index => index < rows.length}
              itemCount={rows.length + 1} // Add an extra row for loading indicator
              loadMoreItems={loadMore}
            >
              {({ onItemsRendered, ref }) => (
                <FixedSizeList
                  height={height}
                  width={width}
                  itemSize={35}
                  itemCount={rows.length}
                  overscanCount={10}
                  onItemsRendered={onItemsRendered}
                  ref={ref}
                >
                  {RenderRow}
                </FixedSizeList>
              )}
            </InfiniteLoader>
          )}
        </AutoSizer>
      </tbody>
    </Table>
  );
};

const App: React.FC = () => {
  const fetchData = async (page: number): Promise<Row[]> => {
    try {
      const response = await axios.post('https://api.example.com/table-data', {
        page,
        pageSize: PAGE_SIZE,
        // Add other request body parameters as needed
      });

      return response.data;
    } catch (error) {
      throw new Error('Error fetching table data.');
    }
  };

  return (
    <div>
      <LargeTable fetchData={fetchData} />
    </div>
  );
};

export default App;
                            
