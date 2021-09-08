# matrix upload-file action

This action uploads a file to a matrix project and attaches it to an item.

## Inputs

## `url`

**Required** The https url of matrix. Example `"https://demo.matrix.com"`.

## `token`

**Required** The Matrix API token to use.

## `project`

**Required** The Matrix project shortcode.

## `file`

**Required** The local file location to upload.

## `item`

**Required** The Matrix item shortcode. The ite should be part pf the project.

## `reason`

**Required** The reason to use, this is comparable to the comment when saving. Default `"github"`.

## `fieldId`

**Required** The field id of the item. Example `"fx5402"`.

## `fileName`

**Required** The file name to use as the attachment name.

## Example usage

```
      - uses: ./.github/actions/upload-file
        with:
          url: https://byteflies.matrixreq.com
          token: ${{ secrets.MATRIX_TOKEN }}
          project: MPROJ
          file: file.pdf
          item: DOC-8
          reason: "Github release"
          fieldId: "fx5402"
          fileName: "Software Design Specification.pdf"
```
