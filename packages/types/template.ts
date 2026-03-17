// Template builder: user-defined sections and items

export type UserSectionItem =
  | {
      id: string;
      type: "yaml_block";
      order: number;
      label?: string;
      content: string;
    }
  | {
      id: string;
      type: "component_ref";
      order: number;
      componentId: string;
    };

export interface UserSection {
  id: string;
  name: string;
  order: number;
  items: UserSectionItem[];
}

export interface TemplateDraft {
  name?: string;
  sections: UserSection[];
}
