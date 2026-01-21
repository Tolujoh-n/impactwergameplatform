import React, { useMemo, useEffect, useCallback } from 'react';
import { createEditor } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import SlateToolbar from './SlateToolbar';

const SlateEditor = ({ value, onChange, placeholder = 'Start writing...', showToolbar = false }) => {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);

  const initialValue = useMemo(() => {
    if (value && Array.isArray(value) && value.length > 0) {
      return value;
    }
    return [
      {
        type: 'paragraph',
        children: [{ text: '' }],
      },
    ];
  }, []);

  const [editorValue, setEditorValue] = React.useState(initialValue);

  // Sync external value changes
  useEffect(() => {
    if (value && JSON.stringify(value) !== JSON.stringify(editorValue)) {
      setEditorValue(value);
    }
  }, [value]);

  const handleChange = useCallback((newValue) => {
    setEditorValue(newValue);
    if (onChange) {
      onChange(newValue);
    }
  }, [onChange]);

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg min-h-[300px] bg-white dark:bg-gray-800">
      <Slate editor={editor} value={editorValue} onChange={handleChange}>
        {showToolbar && <SlateToolbar />}
        <Editable
          placeholder={placeholder}
          className="outline-none min-h-[250px] p-4 text-gray-900 dark:text-white"
          renderElement={({ attributes, children, element }) => {
            switch (element.type) {
              case 'heading-one':
                return <h1 {...attributes} className="text-3xl font-bold mb-4">{children}</h1>;
              case 'heading-two':
                return <h2 {...attributes} className="text-2xl font-bold mb-3">{children}</h2>;
              case 'heading-three':
                return <h3 {...attributes} className="text-xl font-bold mb-2">{children}</h3>;
              case 'bulleted-list':
                return <ul {...attributes} className="list-disc list-inside mb-2 ml-4">{children}</ul>;
              case 'numbered-list':
                return <ol {...attributes} className="list-decimal list-inside mb-2 ml-4">{children}</ol>;
              case 'list-item':
                return <li {...attributes} className="mb-1">{children}</li>;
              case 'link':
                return (
                  <a {...attributes} href={element.url} className="text-blue-500 hover:underline">
                    {children}
                  </a>
                );
              case 'table':
                return (
                  <table {...attributes} className="border-collapse border border-gray-300 dark:border-gray-600 my-4 w-full">
                    <tbody>{children}</tbody>
                  </table>
                );
              case 'table-row':
                return <tr {...attributes}>{children}</tr>;
              case 'table-cell':
                return (
                  <td {...attributes} className="border border-gray-300 dark:border-gray-600 px-4 py-2">
                    {children}
                  </td>
                );
              case 'iframe':
                return (
                  <iframe
                    {...attributes}
                    src={element.url}
                    className="w-full h-64 my-4"
                    frameBorder="0"
                    allowFullScreen
                    title="Embedded content"
                  />
                );
              default:
                return <p {...attributes} className="mb-2">{children}</p>;
            }
          }}
          renderLeaf={({ attributes, children, leaf }) => {
            let el = <span {...attributes}>{children}</span>;
            if (leaf.bold) {
              el = <strong>{el}</strong>;
            }
            if (leaf.italic) {
              el = <em>{el}</em>;
            }
            if (leaf.underline) {
              el = <u>{el}</u>;
            }
            return el;
          }}
        />
      </Slate>
    </div>
  );
};

export default SlateEditor;
